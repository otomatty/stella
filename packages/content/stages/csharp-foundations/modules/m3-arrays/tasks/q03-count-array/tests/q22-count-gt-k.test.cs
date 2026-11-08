public class Q22CountGtKTests
{
    [Fact(DisplayName = "Q22 Kより大きい個数")]
    public void Q22CountGtK()
    {
        Assert.Equal(1, Answers.Q22CountGtK(new int[] { 3, 9, 4 }, 4));
        Assert.Equal(0, Answers.Q22CountGtK(new int[] { 4, 4, 4 }, 4));
        Assert.Equal(2, Answers.Q22CountGtK(new int[] { 5, 6 }, 4));
    }
}
