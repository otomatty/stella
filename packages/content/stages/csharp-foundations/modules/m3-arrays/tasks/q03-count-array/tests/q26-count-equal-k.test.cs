public class Q26CountEqualKTests
{
    [Fact(DisplayName = "Q26 Kと等しい個数")]
    public void Q26CountEqualK()
    {
        Assert.Equal(2, Answers.Q26CountEqualK(new int[] { 1, 4, 4, 0 }, 4));
        Assert.Equal(0, Answers.Q26CountEqualK(new int[] { 1, 2, 3 }, 5));
        Assert.Equal(3, Answers.Q26CountEqualK(new int[] { 7, 7, 7 }, 7));
    }
}
