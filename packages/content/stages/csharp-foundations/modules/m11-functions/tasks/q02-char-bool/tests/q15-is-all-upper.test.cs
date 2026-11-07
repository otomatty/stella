public class Q15IsAllUpperTests
{
    [Fact(DisplayName = "Q15 全部大文字か")]
    public void Q15IsAllUpper()
    {
        Assert.Equal(true, Answers.Q15IsAllUpper("ABC"));
        Assert.Equal(false, Answers.Q15IsAllUpper("ABc"));
        Assert.Equal(false, Answers.Q15IsAllUpper(""));
    }
}
