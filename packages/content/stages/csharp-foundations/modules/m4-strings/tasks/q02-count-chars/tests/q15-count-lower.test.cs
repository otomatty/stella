public class Q15CountLowerTests
{
    [Fact(DisplayName = "Q15 小文字の個数")]
    public void Q15CountLower()
    {
        Assert.Equal(1, Answers.Q15CountLower("ABc"));
        Assert.Equal(0, Answers.Q15CountLower("ABC"));
        Assert.Equal(1, Answers.Q15CountLower("a"));
        Assert.Equal(0, Answers.Q15CountLower(""));
    }
}
