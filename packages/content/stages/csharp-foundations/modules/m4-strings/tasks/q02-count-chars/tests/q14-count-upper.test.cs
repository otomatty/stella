public class Q14CountUpperTests
{
    [Fact(DisplayName = "Q14 大文字の個数")]
    public void Q14CountUpper()
    {
        Assert.Equal(2, Answers.Q14CountUpper("ABc"));
        Assert.Equal(0, Answers.Q14CountUpper("abc"));
        Assert.Equal(0, Answers.Q14CountUpper(""));
    }
}
