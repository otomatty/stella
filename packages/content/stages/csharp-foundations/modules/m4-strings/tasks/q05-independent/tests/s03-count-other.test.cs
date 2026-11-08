public class S03CountOtherTests
{
    [Fact(DisplayName = "S03 異なる文字")]
    public void S03CountOther()
    {
        Assert.Equal(3, Answers.S03CountOther("banana", 'a'));
        Assert.Equal(0, Answers.S03CountOther("", 'a'));
        Assert.Equal(0, Answers.S03CountOther("aaa", 'a'));
        Assert.Equal(3, Answers.S03CountOther("abc", 'z'));
    }
}
