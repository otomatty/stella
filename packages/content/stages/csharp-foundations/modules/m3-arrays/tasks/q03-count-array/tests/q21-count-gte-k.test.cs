public class Q21CountGteKTests
{
    [Fact(DisplayName = "Q21 K以上の個数")]
    public void Q21CountGteK()
    {
        Assert.Equal(3, Answers.Q21CountGteK(new int[] { 3, 9, 4, 11, 6 }, 6));
        Assert.Equal(1, Answers.Q21CountGteK(new int[] { 3, 9, 4, 11, 6 }, 10));
        Assert.Equal(0, Answers.Q21CountGteK(new int[] { 1, 2, 3 }, 10));
    }
}
