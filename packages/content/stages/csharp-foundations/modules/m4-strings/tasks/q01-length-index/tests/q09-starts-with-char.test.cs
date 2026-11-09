public class Q09StartsWithCharTests
{
    [Fact(DisplayName = "Q09 先頭が文字 c か")]
    public void Q09StartsWithChar()
    {
        Assert.Equal(true, Answers.Q09StartsWithChar("abc", 'a'));
        Assert.Equal(false, Answers.Q09StartsWithChar("abc", 'b'));
        Assert.Equal(true, Answers.Q09StartsWithChar("A", 'A'));
    }
}
